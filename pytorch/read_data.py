import torch
from PIL import Image
import os
# # print(dir(torch))
# # print(dir(torch.AVG))
# help(torch.AVG.__sizeof__)

from torch.utils.data import Dataset, DataLoader

class my_data(Dataset):
    #初始化函数 提供一些全局变量和和公共方法
    def __init__(self,root_dir,label_dir):
    #指定类的全局变量
        self.root_dir = root_dir
        self.label_dir = label_dir
        self.path=os.path.join(self.root_dir,self.label_dir)
        self.img_path_list=os.listdir(self.path)



  #getitem是dataset对象自带的方法
    def __getitem__(self,idx):
        #self. 全局变量
        img_name=self.img_path_list[idx]
        img_item_path=os.path.join(self.root_dir,self.label_dir,img_name)
        img=Image.open(img_item_path)
        label=self.label_dir
        return img,label

    def __len__(self):
        return len(self.img_path_list)

root_dir='练手数据集/train'
ants_label_dir='ants_image'
ants_dataset=my_data(root_dir,ants_label_dir)

# print(ants_dataset.__len__())
print(ants_dataset.__getitem__(1))  #Image_open只是把图片读取到内存中
img_dir,img_label=ants_dataset.__getitem__(1)
img_dir.show()
print(img_label)
