# include<iostream>
# include<ctime>
# include<cstdlib>
# include<algorithm>
# include<vector>
using namespace std;

struct Node{
    Node(int data = 0):data_ (data),next_(nullptr) {}
    ~Node(){
        //节点的释放
    }
    int data_; //数据域  末尾的下划线是经典的结构体 int占四个字节 一个节点占8个字节
               //或类的成员变量的命名方式
    Node * next_;
};

class Clink{
    public:
        Clink(){
            //头指针初始化为空，head_指向第一个数据节点（不带头结点）
            head_ = nullptr;
        }
        ~Clink(){
            // 释放所有节点，避免内存泄漏
            Node *p = head_;
            while (p != nullptr) {
                Node *q = p->next_;
                delete p;
                p = q;
            }
        }
    public:
      //旋转链表 给你一个链表的头节点head_,旋转链表，将链表每个节点向右移动k个位置
      //k有可能大于链表长度，但实际上等价于右移k%number
      //实际上就相当于将链表末尾的K个节点进行头插
      //但是单向链表不能从后一个节点访问前面的节点
      //其实相当于把末尾的k个节点挪到链表最前面，或者把前k-1个节点挪到最后面
      //如果指针p指向最后节点，则 p->next_ = head_; 然后再让头指针指向后K个节点的第一个节点，也就是
      //倒数第k个节点
      //所以要先求链表的总个数
      //然后找倒数第k个节点（双指针 先找正数第k个节点 然后同时移动p，q两个指针
      //让p指向 最后一个节点，此时q指向倒数第k+1个节点 这样我们才能让头指针指向倒数第k个节点，并且在构造
      //新的列表后可以让倒数第k+1个节点指针置空，成为新链表的最后一个节点
      //p -> next_ = head_; head_ = q->next_;
      Node * rotateRight(int k){
        if (head_ == nullptr){  //空链表
            return head_;
        }
        //O（n）求链表长度
        int number = 0;
        for(Node *p = head_; p != nullptr; p = p->next_){
            number++;
        }
        k = k % number;
        if (k == 0){  //k是长度的整数倍，相当于不旋转
            return head_;
        }
        //双指针：p先走k步，再让p、q同时走，p到末尾时q指向倒数第k+1个节点
        Node *p = head_;
        Node *q = head_;
        for(int i = 0; i < k;i++){
            p = p->next_;
        }
        while(p ->next_ != nullptr){  //p指向最后一个节点
            q = q->next_;
            p = p->next_;
        }
        p->next_ = head_;
        head_ = q->next_;
        q->next_ = nullptr;
        return head_;
      }

      //尾插法，方便构造测试链表
      void insert(int val){
        Node *node = new Node(val);
        if (head_ == nullptr){
            head_ = node;
            return;
        }
        Node *p = head_;
        while(p->next_ != nullptr){
            p = p->next_;
        }
        p->next_ = node;
      }

      //打印链表，方便观察结果
      void print() const{
        for(Node *p = head_; p != nullptr; p = p->next_){
            cout << p->data_ << " ";
        }
        cout << endl;
      }
    private:
        Node *head_;//指向链表的头节点
};

int main(){
    // 空链表旋转
    {
        Clink link;
        link.rotateRight(3);
        cout << "空链表旋转结果(应为空): ";
        link.print();
    }
    // 单节点旋转
    {
        Clink link;
        link.insert(1);
        link.rotateRight(1);
        cout << "单节点旋转结果(应为 1): ";
        link.print();
    }
    // k=0 不旋转
    {
        Clink link;
        link.insert(1); link.insert(2); link.insert(3); link.insert(4); link.insert(5);
        link.rotateRight(0);
        cout << "k=0(应为 1 2 3 4 5): ";
        link.print();
    }
    // k=长度 不旋转
    {
        Clink link;
        link.insert(1); link.insert(2); link.insert(3); link.insert(4); link.insert(5);
        link.rotateRight(5);
        cout << "k=长度5(应为 1 2 3 4 5): ";
        link.print();
    }
    // k=2
    {
        Clink link;
        link.insert(1); link.insert(2); link.insert(3); link.insert(4); link.insert(5);
        link.rotateRight(2);
        cout << "k=2(应为 4 5 1 2 3): ";
        link.print();
    }
    // k=7 (7%5=2)
    {
        Clink link;
        link.insert(1); link.insert(2); link.insert(3); link.insert(4); link.insert(5);
        link.rotateRight(7);
        cout << "k=7(应为 4 5 1 2 3): ";
        link.print();
    }
    // k=1
    {
        Clink link;
        link.insert(1); link.insert(2); link.insert(3); link.insert(4); link.insert(5);
        link.rotateRight(1);
        cout << "k=1(应为 5 1 2 3 4): ";
        link.print();
    }
    return 0;
}
